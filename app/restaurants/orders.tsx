import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  order_number: string;
  restaurant_id: string;
  food_subtotal: number;
  service_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

type Restaurant = {
  id: string;
  name: string;
};

type OrderWithRestaurant = Order & {
  restaurant?: Restaurant;
};

function showMessage(title: string, message?: string) {
  if (typeof window !== "undefined") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
}

export default function RestaurantOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setOrders([]);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("food_orders")
        .select(`
          id,
          order_number,
          restaurant_id,
          food_subtotal,
          service_fee,
          total_amount,
          payment_status,
          order_status,
          created_at
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("Load restaurant orders error:", orderError);
        showMessage("Unable to load orders", orderError.message);
        return;
      }

      const orderList = (orderData || []) as Order[];

      if (orderList.length === 0) {
        setOrders([]);
        return;
      }

      const restaurantIds = [
        ...new Set(orderList.map((order) => order.restaurant_id)),
      ];

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name")
        .in("id", restaurantIds);

      if (restaurantError) {
        console.error(
          "Load restaurant information error:",
          restaurantError
        );
      }

      const restaurants = (restaurantData || []) as Restaurant[];

      const restaurantMap: Record<string, Restaurant> = {};

      restaurants.forEach((restaurant) => {
        restaurantMap[restaurant.id] = restaurant;
      });

      const combinedOrders = orderList.map((order) => ({
        ...order,
        restaurant: restaurantMap[order.restaurant_id],
      }));

      setOrders(combinedOrders);
    } catch (error: any) {
      console.error("Load orders error:", error);
      showMessage(
        "Unable to load orders",
        error?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getPaymentText = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return "Payment Approved";

      case "pending":
        return "Payment Pending";

      case "failed":
        return "Payment Failed";

      case "refunded":
        return "Refunded";

      case "cancelled":
        return "Payment Cancelled";

      default:
        return paymentStatus;
    }
  };

  const getOrderStatusText = (orderStatus: string) => {
    switch (orderStatus) {
      case "pending_payment":
        return "Payment Pending";

      case "paid":
        return "Payment Approved";

      case "accepted":
        return "Order Accepted";

      case "preparing":
        return "Preparing";

      case "ready_for_pickup":
        return "Ready for Pickup";

      case "picked_up":
        return "Picked Up";

      case "completed":
        return "Completed";

      case "rejected":
        return "Order Rejected";

      case "cancelled":
        return "Cancelled";

      default:
        return orderStatus;
    }
  };

  const getStatusIcon = (
    orderStatus: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (orderStatus) {
      case "pending_payment":
        return "time-outline";

      case "paid":
        return "checkmark-circle-outline";

      case "accepted":
        return "checkmark-outline";

      case "preparing":
        return "restaurant-outline";

      case "ready_for_pickup":
        return "bag-check-outline";

      case "picked_up":
        return "hand-left-outline";

      case "completed":
        return "checkmark-done-circle-outline";

      case "rejected":
      case "cancelled":
        return "close-circle-outline";

      default:
        return "receipt-outline";
    }
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  const renderOrder = ({ item }: { item: OrderWithRestaurant }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.orderCard}
        onPress={() => {
          router.push({
            pathname: "/restaurants/order/[orderId]",
            params: {
              orderId: item.id,
            },
          });
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.receiptIcon}>
            <Ionicons
              name="receipt-outline"
              size={23}
              color="#DC2626"
            />
          </View>

          <View style={styles.orderMain}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {item.restaurant?.name || "Restaurant"}
            </Text>

            <Text style={styles.orderNumber}>
              {item.order_number}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color="#9CA3AF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total</Text>

          <Text style={styles.amount}>
            GH₵ {Number(item.total_amount || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Ionicons
              name={getStatusIcon(item.order_status)}
              size={18}
              color="#DC2626"
            />

            <Text style={styles.statusText}>
              {getOrderStatusText(item.order_status)}
            </Text>
          </View>

          <View
            style={[
              styles.paymentBadge,
              item.payment_status === "paid"
                ? styles.paymentPaid
                : styles.paymentPending,
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                item.payment_status === "paid"
                  ? styles.paymentPaidText
                  : styles.paymentPendingText,
              ]}
            >
              {getPaymentText(item.payment_status)}
            </Text>
          </View>
        </View>

        <Text style={styles.date}>
          {formatDate(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />

        <Text style={styles.loadingText}>
          Loading your orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Orders</Text>

          <Text style={styles.headerSubtitle}>
            Track your restaurant orders
          </Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color="#DC2626"
            />
          </View>

          <Text style={styles.emptyTitle}>
            No Orders Yet
          </Text>

          <Text style={styles.emptyText}>
            Your restaurant orders will appear here.
          </Text>

          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/restaurants")}
          >
            <Text style={styles.browseButtonText}>
              Browse Restaurants
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#DC2626"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  receiptIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  orderMain: {
    flex: 1,
  },

  restaurantName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  orderNumber: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
  },

  amount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 10,
  },

  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  statusText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  paymentBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  paymentPaid: {
    backgroundColor: "#ECFDF5",
  },

  paymentPending: {
    backgroundColor: "#FEF3C7",
  },

  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  paymentPaidText: {
    color: "#047857",
  },

  paymentPendingText: {
    color: "#92400E",
  },

  date: {
    marginTop: 12,
    fontSize: 11,
    color: "#9CA3AF",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },

  browseButton: {
    marginTop: 22,
    backgroundColor: "#DC2626",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },

  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});